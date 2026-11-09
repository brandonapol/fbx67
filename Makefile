SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

TEXT := text-game
WEB := web
GAME := game
VERIFY_TRIALS ?= 2000
VERIFY_SEED ?= 0
STAGED = git diff --cached --name-only --diff-filter=ACMR

.PHONY: help
help:
	@grep -E '^[a-zA-Z0-9/_-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  %-28s %s\n", $$1, $$2}'

.PHONY: setup setup/text setup/web setup/game setup/hooks
setup: setup/text setup/web setup/game setup/hooks ## Install every package and the git hooks

setup/text: ## npm ci in text-game
	cd $(TEXT) && npm ci

setup/web: ## npm ci in web
	cd $(WEB) && npm ci

setup/game: ## npm ci in game
	cd $(GAME) && npm ci

setup/hooks: ## Install the repo's git/hooks as launchers in .git/hooks (pre-commit runs check/fast)
	scripts/install-hooks.bash

.PHONY: test/hooks
test/hooks: ## The hook installer leaves core.hooksPath unset and keeps existing hooks
	scripts/install-hooks.test.bash

.PHONY: check check/fast check/text check/web check/game check/markdown check/routes check/attribution
check: check/text check/web check/game check/routes ## The whole gate CI runs on a pull request

check/fast: ## Seconds: typecheck and unit tests for whichever package has staged files
	@if $(STAGED) | grep -q '^$(TEXT)/'; then $(MAKE) --no-print-directory check/text/typecheck test/text/unit; fi
	@if $(STAGED) | grep -q '^$(WEB)/'; then $(MAKE) --no-print-directory check/web; fi
	@if $(STAGED) | grep -q '^$(GAME)/'; then $(MAKE) --no-print-directory check/game/typecheck test/game/unit; fi

check/text: check/text/typecheck check/text/lint test/text/unit test/text/verify test/text/matrix ## Typecheck, lint, unit, verify, matrix

.PHONY: check/text/typecheck check/text/lint
check/text/typecheck: ## tsc --noEmit on text-game
	cd $(TEXT) && npm run -s typecheck

check/text/lint: ## Story lint over scene sources and ambient lines: the oil rule, names, reachability
	cd $(TEXT) && node --test --test-reporter=dot src/storyLint.test.ts src/ambient/*.test.ts

check/web: ## Typecheck web
	cd $(WEB) && npm run -s typecheck

check/game: check/game/typecheck test/game/unit build/game ## Typecheck, unit-test and build the engine build

.PHONY: check/game/typecheck test/game/unit test/game/smoke
check/game/typecheck: ## tsc on game
	cd $(GAME) && npm run -s typecheck

test/game/unit: ## Mission logic and story parity tests
	cd $(GAME) && npm run -s test

test/game/smoke: build/game ## Play the prologue in headless Chromium; compare frames, check docs/perf.md budgets
	cd $(GAME) && npm run -s smoke

.PHONY: generate/baselines
generate/baselines: build/game ## Replay the smoke test and overwrite game/smoke/baselines with its frames
	cd $(GAME) && SMOKE_BASELINES=update npm run -s smoke

check/routes: ## Fail if a golden transcript or the matrix summary is stale
	cd $(TEXT) && npm run -s golden
	git diff --exit-code -- $(TEXT)/routes || { echo "routes/ is stale: run make generate/routes and commit"; exit 1; }

check/attribution: ## Fail if a pull request's title, description or commits carry AI attribution (PR=number)
	@[[ -n "$(PR)" ]] || { echo "Usage: make check/attribution PR=<pull request number>"; exit 1; }
	@command -v gh >/dev/null || { echo "Install the GitHub CLI and run gh auth login (in CI, set GH_TOKEN)."; exit 1; }
	@gh pr view "$(PR)" --json title,body,commits \
		--jq '"title: " + .title, (.body | split("\n")[] | "description: " + .), (.commits[] | "commit \(.oid[0:8]): " + (.messageHeadline, (.messageBody | split("\n")[])))' | \
		ATTRIBUTION_FIX="Edit the pull request title or description, or reword the commit and push. Then re-run this check." scripts/check-attribution.bash

check/markdown: ## markdownlint on docs (needs npx)
	npx --yes markdownlint-cli2 "**/*.md" "#**/node_modules" "#**/dist"

.PHONY: test test/text/unit test/text/verify test/text/matrix test/text/explore
test: test/text/unit ## Unit tests and golden replay

test/text/unit: ## node --test on text-game
	cd $(TEXT) && node --test --test-reporter=dot src/*.test.ts src/ambient/*.test.ts

test/text/verify: ## Randomized check that liveness pruning is safe
	cd $(TEXT) && node src/verify.ts --trials $(VERIFY_TRIALS) --seed $(VERIFY_SEED)

test/text/matrix: ## Decision matrix matches routes/matrix-summary.json
	cd $(TEXT) && npm run -s matrix:check

test/text/explore: ## Exhaustive sweep of every reachable state (~15 s, 1.5 GB)
	cd $(TEXT) && npm run -s explore

.PHONY: generate/routes generate/characters generate/assets test/assets
generate/routes: ## Regenerate golden transcripts and the matrix summary
	cd $(TEXT) && npm run -s golden

generate/characters: ## Rebuild game/public/characters from game/assets/characters.json
	cd $(GAME) && NODE_USE_ENV_PROXY=1 node tools/characters.ts

generate/assets: ## Rebuild game/public/props (CC0 props, procedural buildings) from game/assets/environment.json
	cd $(GAME) && NODE_USE_ENV_PROXY=1 node tools/assets.ts

test/assets: ## Load the generated assets in headless Chromium; print load times, draw calls, memory (SHOT=file.png)
	cd $(GAME) && node tools/measure.ts

.PHONY: play serve/web build/web serve/game build/game build/pages
play: ## Play the text build in the terminal
	cd $(TEXT) && npm run -s play

serve/web: ## Vite dev server for the browser build
	cd $(WEB) && npm run dev

build/web: ## Production build of web/ into web/dist
	cd $(WEB) && npm run build

serve/game: ## Vite dev server for the engine build
	cd $(GAME) && npm run dev

build/game: ## Production build of game/ into game/dist
	cd $(GAME) && npx vite build

build/pages: build/web build/game ## The Pages site: web/dist with the engine build under play/
	rm -rf $(WEB)/dist/play
	cp -r $(GAME)/dist $(WEB)/dist/play
