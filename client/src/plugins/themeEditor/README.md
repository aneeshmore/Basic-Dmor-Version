# Theme Editor Plugin

A modular, pluggable UI customization plugin that allows runtime theme customization with preset themes and custom color pickers.

## Features

- ✅ **Pluggable Architecture** - Easy to enable/disable via environment variable
- ✅ **Production Safe** - Can be completely removed without affecting core functionality
- ✅ **Preset Themes** - 11 beautiful pre-designed color palettes
- ✅ **Custom Colors** - Fine-tune individual colors with color pickers
- ✅ **Persistent Storage** - Themes saved to localStorage
- ✅ **Live Preview** - See changes in real-time
- ✅ **Type Safe** - Full TypeScript support

## Usage

### Enable Theme Editor

Add to your `.env` file:

```env
VITE_ENABLE_THEME_EDITOR=true
```

### Configuration

Edit `config.ts` to customize behavior:

```typescript
export const THEME_EDITOR_CONFIG = {
  enabled: import.meta.env.VITE_ENABLE_THEME_EDITOR === "true",
  storageKey: "morex-theme",

  defaultTheme: {
    primary: "#6366f1",
    secondary: "#64748b",
    // ... other colors
  },

  logging: {
    enabled: true,
  },
};
```

### Using in Your App

```typescript
import {
  useTheme,
  ThemeEditor,
  isThemeEditorEnabled,
} from "@/plugins/themeEditor";

function App() {
  const { theme, setTheme } = useTheme();
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  return (
    <>
      {/* Your app content */}

      {isThemeEditorEnabled() && (
        <ThemeEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          currentTheme={theme}
          onThemeChange={setTheme}
        />
      )}
    </>
  );
}
```

## Architecture

```
plugins/themeEditor/
├── config.ts          # Configuration and feature flags
├── themes.ts          # Preset theme definitions
├── themeManager.ts    # Theme persistence and DOM manipulation
├── useTheme.ts        # React hook for theme management
├── ThemeEditor.tsx    # UI component
├── index.ts           # Public API exports
└── README.md          # This file
```

### Key Components

#### `ThemeManager`

Handles theme persistence and application to DOM via CSS variables.

```typescript
const themeManager = new ThemeManager();

// Load theme from storage
const theme = themeManager.loadTheme();

// Apply theme to DOM
themeManager.applyTheme(theme);

// Reset to default
themeManager.resetTheme();
```

#### `useTheme()` Hook

React hook for theme management in components.

```typescript
const { theme, setTheme, resetTheme, isEnabled } = useTheme();
```

#### `ThemeEditor` Component

Full-featured UI for theme customization with tabs for presets and custom colors.

## Available Themes

1. **Default** - Modern indigo theme
2. **Ocean** - Cool blue tones
3. **Forest** - Natural green palette
4. **Sunset** - Warm amber colors
5. **Purple** - Rich purple shades
6. **Midnight** - Dark mode theme
7. **Coral** - Vibrant pink/red
8. **Cyber** - Futuristic cyan
9. **Lavender** - Soft purple
10. **Emerald** - Deep green
11. **Monochrome** - Grayscale theme

## Adding Custom Themes

Edit `themes.ts`:

```typescript
export const PRESET_THEMES: Record<string, ThemeConfig> = {
  myTheme: {
    primary: "#your-color",
    secondary: "#your-color",
    background: "#your-color",
    surface: "#your-color",
    textPrimary: "#your-color",
    textSecondary: "#your-color",
    border: "#your-color",
    success: "#your-color",
    danger: "#your-color",
  },
};
```

## CSS Variables

The theme manager applies these CSS variables to `:root`:

- `--primary` - Primary brand color
- `--secondary` - Secondary color
- `--background` - Page background
- `--surface` - Card/surface color
- `--text-primary` - Main text color
- `--text-secondary` - Secondary text color
- `--border` - Border color
- `--success` - Success state color
- `--danger` - Error/danger color

## Removing for Production

### Option 1: Disable via Environment Variable

```env
VITE_ENABLE_THEME_EDITOR=false
```

### Option 2: Complete Removal

1. Delete the entire `/plugins/themeEditor` folder
2. Remove imports from App.tsx:
   ```typescript
   // Remove these lines
   import {
     useTheme,
     ThemeEditor,
     isThemeEditorEnabled,
   } from "@/plugins/themeEditor";
   ```
3. Remove `VITE_ENABLE_THEME_EDITOR` from `.env` files
4. Remove theme editor button/trigger from UI

## Integration with Design System

The theme editor works seamlessly with the golden ratio design system defined in `design-system.css`. Theme colors are applied as CSS variables that the design system references.

## Browser Compatibility

- Modern browsers with CSS custom properties support
- localStorage for persistence
- Color input type support (fallback to text input)

## Development Tips

1. **Testing Themes**: Enable logging in config to see theme changes in console
2. **Custom Presets**: Add your brand colors as a preset theme
3. **Default Theme**: Set your brand theme as the default in config
4. **Storage Key**: Change `storageKey` if you need to reset all user themes

## Security Notes

⚠️ **Theme data is stored in localStorage** - This is safe for color preferences but don't store sensitive data.

## Comparison with Dummy Mode Plugin

Both plugins follow the same modular pattern:

| Feature              | Theme Editor               | Dummy Mode                  |
| -------------------- | -------------------------- | --------------------------- |
| Environment Variable | `VITE_ENABLE_THEME_EDITOR` | `VITE_ENABLE_DUMMY_MODE`    |
| Location             | `/plugins/themeEditor/`    | `/plugins/dummyMode/`       |
| Removable            | ✅ Yes                     | ✅ Yes                      |
| Production Safe      | ✅ Yes                     | ✅ Yes                      |
| Purpose              | UI Customization           | Development without backend |

## License

Part of Morex Technologies ERP System
