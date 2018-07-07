
#!/bin/sh

setup_git() {
  git config --global user.email "travis@travis-ci.org"
  git config --global user.name "Travis CI"
}

commit_website_files() {
  git checkout -b gh-pages
  git add . *.html
  git commit --message "Travis build: $TRAVIS_BUILD_NUMBER"
}

upload_files() {
  git remote add travis https://${GH_TOKEN}@github.com/${TRAVIS_REPO_SLUG} # > /dev/null 2>&1
  git push --follow-tags --quiet travis $TRAVIS_BRANCH 
}

setup_git
# commit_website_files
git log --oneline -n 5
upload_files