-- File explorer plugin configuration.
return {
  "nvim-neo-tree/neo-tree.nvim",
  branch = "v3.x",
  dependencies = {
    "nvim-lua/plenary.nvim",
    "nvim-tree/nvim-web-devicons", -- Optional, but recommended for file icons.
    "MunifTanjim/nui.nvim",
  },
  config = function()
    require("neo-tree").setup({
      window = {
        -- Keep the explorer narrow so the current buffer remains visible.
        width = 30,
      },
      filesystem = {
        filtered_items = {
          -- Show filtered entries, including dotfiles, but still hide gitignored files.
          visible = true,
          hide_dotfiles = false,
          hide_gitignored = true,
        },
      },
    })

    -- Open Neo-tree on the right, revealing the current file.
    vim.keymap.set("n", "<C-n>", ":Neotree filesystem reveal right<CR>")

    -- Close Neo-tree.
    vim.keymap.set("n", "<C-m>", ":Neotree close<CR>")
  end,
}
