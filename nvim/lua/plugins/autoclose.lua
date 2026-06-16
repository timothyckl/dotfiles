return {
	"m4xshen/autoclose.nvim",
	config = function()
		local autolose = require("autoclose")
		autolose.setup({
			keys = {
				-- put additional characters here
				-- ["$"] = { escape = true, close = true, pair = "$$", disabled_filetypes = {} },
			},
		})
	end,
}
