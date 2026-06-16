return {
  'nvim-lualine/lualine.nvim',
  dependencies = { 'nvim-tree/nvim-web-devicons' },
  config = function()
    local colours = {
      blue = '#71b7ff',
      bg = '#0a0c10',
      g1 = '#272b33',
      g2 = '#525964',
      g3 = '#7a828e',
      g4 = '#9ea7b3',
      fg = '#f0f3f6',
      red = '#ff7b72',
      yellow = '#f2cc60',
      green = '#7ee787',
    }

    local tmux_power = {
      normal = {
        a = { fg = colours.bg, bg = colours.blue, gui = 'bold' },
        b = { fg = colours.g4, bg = colours.g1 },
        c = { fg = colours.g3, bg = colours.bg },
      },
      insert = {
        a = { fg = colours.bg, bg = colours.green, gui = 'bold' },
        b = { fg = colours.g4, bg = colours.g1 },
        c = { fg = colours.g3, bg = colours.bg },
      },
      visual = {
        a = { fg = colours.bg, bg = colours.yellow, gui = 'bold' },
        b = { fg = colours.g4, bg = colours.g1 },
        c = { fg = colours.g3, bg = colours.bg },
      },
      replace = {
        a = { fg = colours.bg, bg = colours.red, gui = 'bold' },
        b = { fg = colours.g4, bg = colours.g1 },
        c = { fg = colours.g3, bg = colours.bg },
      },
      command = {
        a = { fg = colours.bg, bg = colours.blue, gui = 'bold' },
        b = { fg = colours.g4, bg = colours.g1 },
        c = { fg = colours.g3, bg = colours.bg },
      },
      inactive = {
        a = { fg = colours.g3, bg = colours.g1, gui = 'bold' },
        b = { fg = colours.g3, bg = colours.bg },
        c = { fg = colours.g2, bg = colours.bg },
      },
    }

    require('lualine').setup({
      options = {
        theme = tmux_power,
        component_separators = '',
        section_separators = { left = '', right = '' },
        globalstatus = true,
        disabled_filetypes = { statusline = { 'dashboard', 'alpha' } },
      },
      sections = {
        lualine_a = { { 'mode', icon = '' } },
        lualine_b = { { 'branch', icon = '' }, 'diff' },
        lualine_c = { { 'filename', path = 1, symbols = { modified = ' ●', readonly = ' ' } } },
        lualine_x = { 'diagnostics', 'encoding', 'filetype' },
        lualine_y = { { 'progress', separator = { left = '', right = '' } } },
        lualine_z = { { 'location', icon = '' } },
      },
      inactive_sections = {
        lualine_a = {},
        lualine_b = {},
        lualine_c = { 'filename' },
        lualine_x = { 'location' },
        lualine_y = {},
        lualine_z = {},
      },
      extensions = { 'neo-tree', 'lazy', 'mason', 'quickfix', 'trouble' },
    })
  end,
}
