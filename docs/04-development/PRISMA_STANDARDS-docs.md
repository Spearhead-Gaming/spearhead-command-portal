# Prisma Standards

## Database

Use MariaDB provider.

## Naming

- Models use PascalCase
- Fields use camelCase
- Join tables should have clear names
- Use createdAt and updatedAt

## Migration Rules

- Never edit production migrations casually
- Review generated migrations
- Seed core roles, permissions, ranks, units, statuses

## Prisma Usage

- Keep Prisma calls mostly inside service/data-access layers
- Avoid putting complex queries directly into React components
