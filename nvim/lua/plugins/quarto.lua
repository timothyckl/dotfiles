return {
  {
    "quarto-dev/quarto-nvim",
    ft = { "quarto" },
    dependencies = {
      "jmbuhr/otter.nvim",
      "nvim-treesitter/nvim-treesitter",
      "jpalardy/vim-slime",
    },
    config = function()
      require("quarto").setup({
        lspFeatures = {
          enabled = true,
          chunks = "curly",
          languages = { "r", "python", "julia", "bash", "html" },
          diagnostics = {
            enabled = true,
            triggers = { "BufWritePost" },
          },
          completion = {
            enabled = true,
          },
        },
        codeRunner = {
          enabled = true,
          default_method = "slime",
        },
      })

      local runner = require("quarto.runner")

      vim.keymap.set("n", "<leader>qp", "<cmd>QuartoPreview<cr>", { desc = "Quarto preview" })
      vim.keymap.set("n", "<leader>rc", runner.run_cell, { desc = "Run current Quarto cell" })
      vim.keymap.set("n", "<leader>ra", runner.run_above, { desc = "Run Quarto cell and above" })
      vim.keymap.set("n", "<leader>rA", runner.run_all, { desc = "Run all Quarto cells" })
      vim.keymap.set("n", "<leader>rl", runner.run_line, { desc = "Run current line" })
      vim.keymap.set("v", "<leader>r", runner.run_range, { desc = "Run selected range" })
    end,
  },
  {
    "jpalardy/vim-slime",
    init = function()
      vim.g.slime_target = "neovim"
      vim.g.slime_no_mappings = 1
    end,
    config = function()
      vim.g.slime_input_pid = false
      vim.g.slime_suggest_default = true
      vim.g.slime_menu_config = false
      vim.g.slime_neovim_ignore_unlisted = false

      vim.keymap.set("n", "<leader>cm", function()
        local jobid = vim.b.terminal_job_id
          or (vim.b.slime_config and vim.b.slime_config.jobid)
          or vim.g.slime_last_channel

        if jobid then
          vim.notify("Slime terminal job id: " .. jobid)
        else
          vim.notify("No Slime terminal job id found", vim.log.levels.WARN)
        end
      end, { desc = "Mark/show terminal job id" })
      vim.keymap.set("n", "<leader>cs", "<Plug>SlimeConfig", { desc = "Configure Slime target", remap = true })
    end,
  },
  {
    "HakonHarnes/img-clip.nvim",
    ft = { "quarto", "markdown" },
    opts = {
      default = {
        dir_path = "img",
      },
    },
    keys = {
      { "<leader>ii", "<cmd>PasteImage<cr>", desc = "Paste image from clipboard" },
    },
  },
  {
    "jbyuki/nabla.nvim",
    ft = { "quarto", "markdown" },
    keys = {
      {
        "<leader>qm",
        function()
          require("nabla").toggle_virt()
        end,
        desc = "Toggle math equation preview",
      },
    },
  },
}
