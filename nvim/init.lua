-- Use backslash as the local leader key for buffer/filetype-specific mappings.
vim.g.maplocalleader = "\\"

-- Install lazy.nvim automatically if it is not already present.
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"

if not vim.loop.fs_stat(lazypath) then
	vim.fn.system({
		"git",
		"clone",
		"--filter=blob:none",
		"https://github.com/folke/lazy.nvim.git",
		"--branch=stable", -- Use the latest stable lazy.nvim release.
		lazypath,
	})
end

-- Add lazy.nvim to Neovim's runtime path so it can be required below.
vim.opt.rtp:prepend(lazypath)

-- Load core editor settings, then initialise plugins from lua/plugins/.
require("settings")
require("lazy").setup("plugins")
