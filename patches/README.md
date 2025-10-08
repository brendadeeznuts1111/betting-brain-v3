# Bun Patches Directory

Package patches created with `bun patch` are stored here.

## Usage

### Create a patch:
```bash
bun patch <package>@<version>
# Example: bun patch left-pad@1.3.0
```

This will:
1. Extract the package to a temp directory
2. Open it in your editor
3. Generate `patches/<package>@<version>.patch` when you save

### Apply patches:
Patches are automatically applied during `bun install`.

### Remove a patch:
Delete the `.patch` file and run `bun install`.

## Current Patches

(none)

---
**Note:** Patches are similar to `patch-package` but native to Bun.

