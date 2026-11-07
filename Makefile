SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

TEXT := text-game
WEB := web
VERIFY_TRIALS ?= 2000
VERIFY_SEED ?= 0
STAGED = git diff --cached --name-only --diff-filter=ACMR

.PHONY: help
help:
	@grep -E '^[a-zA-Z0-9/_-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  %-28s %s\n", $$1, $$2}'

.PHONY: setup setup/text setup/web setup/hooks
setup: setup/text setup/web setup/hooks ## Install every package and the git hooks

setup/text: ## npm ci in text-game
	cd $(TEXT) && npm ci

setup/web: ## npm ci in web
	cd $(WEB) && npm ci

setup/hooks: ## Point git at the repo's hooks (pre-commit runs check/fast)
	git config core.hooksPath git/hooks

.PHONY: check check/fast check/text check/web check/markdown check/routes
check: check/text check/web check/routes ## The whole gate CI runs on a pull request

check/fast: ## Seconds: typecheck and unit tests for whichever package has staged files
	@if $(STAGED) | grep -q '^$(TEXT)/'; then $(MAKE) --no-print-directory check/text/typecheck test/text/unit; fi
	@if $(STAGED) | grep -q '^$(WEB)/'; then $(MAKE) --no-print-directory check/web; fi

check/text: check/text/typecheck test/text/unit test/text/verify test/text/matrix ## Typecheck, unit, verify, matrix

.PHONY: check/text/typecheck
check/text/typecheck: ## tsc --noEmit on text-game
	cd $(TEXT) && npm run -s typecheck

check/web: ## Typecheck web
	cd $(WEB) && npm run -s typecheck

check/routes: ## Fail if a golden transcript or the matrix summary is stale
	cd $(TEXT) && npm run -s golden
	git diff --exit-code -- $(TEXT)/routes || { echo "routes/ is stale: run make generate/routes and commit"; exit 1; }

check/markdown: ## markdownlint on docs (needs npx)
	npx --yes markdownlint-cli2 "**/*.md" "#**/node_modules" "#**/dist"

.PHONY: test test/text/unit test/text/verify test/text/matrix test/text/explore
test: test/text/unit ## Unit tests and golden replay

test/text/unit: ## node --test on text-game
	cd $(TEXT) && node --test --test-reporter=dot src/*.test.ts

test/text/verify: ## Randomized check that liveness pruning is safe
	cd $(TEXT) && node src/verify.ts --trials $(VERIFY_TRIALS) --seed $(VERIFY_SEED)

test/text/matrix: ## Decision matrix matches routes/matrix-summary.json
	cd $(TEXT) && npm run -s matrix:check

test/text/explore: ## Exhaustive sweep of every reachable state (~15 s, 1.5 GB)
	cd $(TEXT) && npm run -s explore

.PHONY: generate/routes
generate/routes: ## Regenerate golden transcripts and the matrix summary
	cd $(TEXT) && npm run -s golden

.PHONY: play serve/web build/web
play: ## Play the text build in the terminal
	cd $(TEXT) && npm run -s play

serve/web: ## Vite dev server for the browser build
	cd $(WEB) && npm run dev

build/web: ## Production build of web/ into web/dist
	cd $(WEB) && npm run build
