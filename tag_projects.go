package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"regexp"
	"strings"
)

func main() {
	// Read the projects.md file
	content, err := ioutil.ReadFile("projects.md")
	if err != nil {
		fmt.Println("Error reading projects.md:", err)
		return
	}

	// Split the content into project sections
	projects := strings.Split(string(content), "\n\n# ")

	// Regex to find the GitHub URL
	githubRegex := regexp.MustCompile(`\[Github\]\((https://github.com/rberenguel/.*?)\)`)

	// Regex to check for YYYYMM tag
	tagRegex := regexp.MustCompile(`#[0-9]{6}`)

	var updatedProjects []string

	for i, project := range projects {
		if i == 0 && strings.HasPrefix(project, "# ") {
			project = strings.TrimPrefix(project, "# ")
		}

		if strings.TrimSpace(project) == "" {
			continue
		}

		// Check if the project already has a YYYYMM tag
		if tagRegex.MatchString(project) {
			updatedProjects = append(updatedProjects, project)
			continue
		}

		// Find the GitHub URL
		matches := githubRegex.FindStringSubmatch(project)
		if len(matches) < 2 {
			updatedProjects = append(updatedProjects, project)
			continue
		}
		repoURL := matches[1]

		// Get the first commit date
		date, err := getFirstCommitDate(repoURL)
		if err != nil {
			fmt.Printf("Error getting first commit date for %s: %v\n", repoURL, err)
			updatedProjects = append(updatedProjects, project)
			continue
		}

		// Add the new tag to the project
		project = strings.TrimRight(project, "\n ")
		tag := fmt.Sprintf("\n#%s", date)
		newProject := project + tag
		updatedProjects = append(updatedProjects, newProject)
	}

	// Write the updated content back to projects.md
	output := "# " + strings.Join(updatedProjects, "\n\n# ")
	err = ioutil.WriteFile("projects.md", []byte(output), 0644)
	if err != nil {
		fmt.Println("Error writing to projects.md:", err)
	}
}

func getFirstCommitDate(repoURL string) (string, error) {
	// Create a temporary directory
	tmpDir, err := ioutil.TempDir("", "project")
	if err != nil {
		return "", err
	}
	defer os.RemoveAll(tmpDir)

	// Clone the repository
	cmd := exec.Command("git", "clone", repoURL, tmpDir)
	err = cmd.Run()
	if err != nil {
		return "", err
	}

	// Get the first commit date
	cmd = exec.Command("git", "-C", tmpDir, "log", "--reverse", "--format=%ad", "--date=format:%Y%m", "HEAD")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}

	date := strings.Split(string(output), "\n")[0]

	return strings.TrimSpace(date), nil
}