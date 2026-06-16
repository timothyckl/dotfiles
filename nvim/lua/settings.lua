-- Convert typed tabs into spaces.
vim.cmd("set expandtab")

-- Show absolute current line and relative numbers elsewhere.
vim.opt.number = true
vim.wo.relativenumber = true

-- Highlight only the current line number.
vim.opt.cursorline = true
vim.opt.cursorlineopt = "number"

-- Enable full 24-bit terminal colours for themes and plugin highlights.
vim.opt.termguicolors = true

-- Use space as the main leader key for custom mappings.
vim.g.mapleader = " "

-- Treat Quarto Markdown files as Markdown so they use the same settings.
vim.filetype.add({
	extension = {
		qmd = "markdown",
	},
})
