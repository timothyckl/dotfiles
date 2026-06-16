-- Fuzzy finder plugin configuration.
return {
  "nvim-telescope/telescope.nvim",
  tag = "0.1.5",
  dependencies = { "nvim-lua/plenary.nvim" },
  config = function()
    local builtin = require("telescope.builtin")

    -- Find files in the current working directory.
    vim.keymap.set("n", "<C-p>", builtin.find_files, {})

    -- Search text across the current working directory with ripgrep.
    vim.keymap.set("n", "<leader>lg", builtin.live_grep, {})
  end,
}
