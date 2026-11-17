SHELL := /bin/sh
VERSION := $(shell node -p "require('./package.json').version")
TARBALL := ctour-$(VERSION).tgz
TMP := .tmp/release

.PHONY: help release verify pack build test e2e lint typecheck install clean dist

help:
	@printf 'make targets\n\n'
	@printf '  make release    typecheck, unit tests, build, pack ctour-%s.tgz, verify the tarball\n' '$(VERSION)'
	@printf '  make verify     install %s into %s and run it\n' '$(TARBALL)' '$(TMP)'
	@printf '  make pack       build and pack %s only\n' '$(TARBALL)'
	@printf '  make install    install %s globally on this machine\n' '$(TARBALL)'
	@printf '  make test       unit and cli tests (vitest)\n'
	@printf '  make e2e        acceptance tests (playwright)\n'
	@printf '  make lint       eslint and prettier check\n'
	@printf '  make typecheck  tsc --noEmit\n'
	@printf '  make clean      remove dist, .next, %s and %s\n' '$(TARBALL)' '$(TMP)'
	@printf '  make bump-patch bump the version before a new release\n'
	@printf '  make bump-minor bump the minor version before a new release\n'

check-clean:
	@if [ -z '$(ALLOW_DIRTY)' ] && [ -n "$$(git status --porcelain)" ]; then \
		printf 'the tree has uncommitted changes; commit them, or run make release ALLOW_DIRTY=1\n' >&2; \
		exit 1; \
	fi

check-tag:
	@code="$$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://api.github.com/repos/Alice088/cognitive-tours-forge/releases/tags/v$(VERSION) || true)"; \
	if [ "$$code" = '200' ]; then \
		printf 'release v%s already exists; bump it with make bump-patch, or rebuild the asset with make pack\n' '$(VERSION)' >&2; \
		exit 1; \
	fi

bump-patch:
	npm version patch --no-git-tag-version

bump-minor:
	npm version minor --no-git-tag-version

release: check-clean check-tag typecheck test build pack verify
	@printf '\nrelease %s is ready\n\n' '$(VERSION)'
	@printf '  file    %s\n' '$(TARBALL)'
	@printf '  size    %s\n' "$$(du -h '$(TARBALL)' | cut -f1)"
	@printf '  sha256  %s\n' "$$(sha256sum '$(TARBALL)' | cut -d' ' -f1)"
	@printf '  commit  %s\n' "$$(git rev-parse HEAD)"
	@printf '\nnext\n'
	@printf '  1. tag and push:      git tag v%s && git push origin v%s\n' '$(VERSION)' '$(VERSION)'
	@printf '  2. attach the file:   upload %s to release v%s\n' '$(TARBALL)' '$(VERSION)'
	@printf '  3. install.sh then uses it instead of building:\n'
	@printf '     https://github.com/Alice088/cognitive-tours-forge/releases/download/v%s/%s\n' '$(VERSION)' '$(TARBALL)'
	@printf '  4. optional, npm:     npm publish %s\n' '$(TARBALL)'

build:
	npm run build:all

pack: build
	rm -f ctour-*.tgz
	npm pack --silent
	@test -f '$(TARBALL)' || { printf 'expected %s to be produced\n' '$(TARBALL)' >&2; exit 1; }

verify: dist
	@test -f '$(TARBALL)' || { printf '%s is missing; run make pack first\n' '$(TARBALL)' >&2; exit 1; }
	rm -rf '$(TMP)'
	npm install -g './$(TARBALL)' --ignore-scripts --prefix '$(PWD)/$(TMP)' --loglevel=error
	'$(PWD)/$(TMP)/bin/ctour' --version
	@printf 'verified %s\n' '$(TARBALL)'

dist:
	@mkdir -p '$(TMP)'

install: verify
	@printf 'installed into %s\n' '$(TMP)'

test:
	npm run test:unit

e2e:
	npm run test:e2e

typecheck:
	npm run typecheck

lint:
	npm run lint
	npx prettier --check app tests cli specs README.md docs

clean:
	rm -rf dist .next '$(TMP)' ctour-*.tgz
