<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

> **Note**: For comprehensive project documentation, architecture guides, and workflows, please refer to the main [README.md](./README.md).

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Architecture Standards (STRICT)
This project follows a **Clean Architecture (Vertical Slices)** pattern. You MUST read and follow `CLEAN_ARCHITECTURE.md` before making any changes.

1. **Isolation**: No direct database/Supabase calls in `app/`. Use the Repository pattern in `features/[feature]/infrastructure/`.
2. **Logic**: Business logic must reside in `features/[feature]/use-cases/`.
3. **Shared Core**: Use `core/entities` for types and `core/formatters` for formatting logic.
4. **Data Masking**: All financial data MUST be masked/unmasked in the Repository layer using the User-Derived Offset logic. Check `GEMINI.md` for details.
<!-- END:nextjs-agent-rules -->
