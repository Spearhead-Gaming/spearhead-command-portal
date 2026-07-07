# ADR-002: Use MariaDB

## Status

Accepted

## Context

The project owner prefers MariaDB over PostgreSQL.

## Decision

MariaDB will be the primary database.

Prisma will be used as the ORM and migration tool.

## Consequences

- Avoid PostgreSQL-specific features
- Design clean relational schemas
- Ensure Prisma compatibility with MariaDB
