COMMAND_COLOR = \033[36m
DESC_COLOR    = \033[32m
CLEAR_COLOR   = \033[0m

.PHONY: help
help: ## prints this message ## 
	@echo ""; \
	echo "Usage: make <command>"; \
	echo ""; \
	echo "where <command> is one of the following:"; \
	echo ""; \
	grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	perl -nle '/(.*?): ## (.*?) ## (.*$$)/; if ($$3 eq "") { printf ( "$(COMMAND_COLOR)%-20s$(DESC_COLOR)%s$(CLEAR_COLOR)\n\n", $$1, $$2) } else { printf ( "$(COMMAND_COLOR)%-20s$(DESC_COLOR)%s$(CLEAR_COLOR)\n%-20s%s\n\n", $$1, $$2, " ", $$3) }';

.PHONY: install
install: ## Install npm packages ## 
	@echo "Installing Dependencies..."; \
	npm install;

.PHONY: sass
sass: ## sass --watch input.scss output.css ## 
	@echo "Compiling Sass..."; \
	./node_modules/.bin/sass --watch unpacked/panel/assets/stylesheets/panel.scss unpacked/panel/assets/stylesheets/panel.css;