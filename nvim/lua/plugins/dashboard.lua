return {
	"goolord/alpha-nvim",
	dependencies = {
		"nvim-tree/nvim-web-devicons",
		"nvim-lua/plenary.nvim",
	},
	config = function()
		local alpha = require("alpha")
		local dashboard = require("alpha.themes.theta")

		dashboard.header.val = {
      [[ .------..------..------..------..------..------. ]],
      [[ |N.--. ||E.--. ||O.--. ||V.--. ||I.--. ||M.--. | ]],
      [[ | :(): || (\/) || :/\: || :(): || (\/) || (\/) | ]],
      [[ | ()() || :\/: || :\/: || ()() || :\/: || :\/: | ]],
      [[ | '--'N|| '--'E|| '--'O|| '--'V|| '--'I|| '--'M| ]],
      [[ `------'`------'`------'`------'`------'`------' ]]
		}

		dashboard.buttons.val = {}

		alpha.setup(dashboard.config)
	end,
}
