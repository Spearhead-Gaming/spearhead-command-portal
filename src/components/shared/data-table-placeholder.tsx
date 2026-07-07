import { Fragment } from "react";

import { FilterBar } from "@/components/data/filter-bar";
import { SearchInput } from "@/components/data/search-input";
import { ActionMenu } from "@/components/inspector/action-menu";
import { AttendanceBadge } from "@/components/status/attendance-badge";
import { QualificationBadge } from "@/components/status/qualification-badge";
import { RankBadge } from "@/components/status/rank-badge";
import { StatusBadge } from "@/components/status/status-badge";
import { UnitBadge } from "@/components/status/unit-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PlaceholderTable } from "@/types/placeholder-page";

type DataTablePlaceholderProps = {
  table: PlaceholderTable;
};

function renderCell(column: string, value: string, actionMenuItems?: string[]) {
  const normalized = column.toLowerCase();

  if (normalized === "actions") {
    return <ActionMenu items={actionMenuItems} label="Row Actions" />;
  }

  if (normalized === "rank") {
    return <RankBadge label={value} />;
  }

  if (normalized.includes("unit")) {
    return <UnitBadge label={value} />;
  }

  if (normalized.includes("qualification")) {
    return <QualificationBadge label={value} />;
  }

  if (normalized.includes("attendance")) {
    return <AttendanceBadge label={value} />;
  }

  if (normalized.includes("status")) {
    return <StatusBadge label={value} tone="muted" />;
  }

  return value;
}

export function DataTablePlaceholder({ table }: DataTablePlaceholderProps) {
  const supportBadges = ["Sorting", "Pagination", "Row Actions", "Mobile Cards"];
  const actionColumnIndex = table.columns.findIndex(
    (column) => column.toLowerCase() === "actions",
  );
  const visibleColumnIndexes = table.columns
    .map((_, index) => index)
    .filter((index) => index !== actionColumnIndex)
    .slice(0, actionColumnIndex >= 0 ? 4 : 5);
  const orderedVisibleColumnIndexes =
    actionColumnIndex >= 0 ? [...visibleColumnIndexes, actionColumnIndex] : visibleColumnIndexes;
  const hiddenColumnIndexes = table.columns
    .map((_, index) => index)
    .filter((index) => !orderedVisibleColumnIndexes.includes(index));

  return (
    <Card className="overflow-hidden border-border/80 bg-card/80">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>{table.title}</CardTitle>
            <CardDescription>{table.description}</CardDescription>
          </div>
          <ActionMenu items={table.actionMenuItems} label="Table Actions" />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput placeholder={table.searchPlaceholder} />
          <FilterBar filters={table.filters} supports={supportBadges} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {orderedVisibleColumnIndexes.map((columnIndex) => {
                const column = table.columns[columnIndex] ?? "";

                return (
                <TableHead key={column}>{column}</TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((row, rowIndex) => (
              <Fragment key={`${table.title}-${rowIndex}`}>
                <TableRow>
                  {orderedVisibleColumnIndexes.map((cellIndex) => {
                    const column = table.columns[cellIndex] ?? "";
                    const cell = row[cellIndex] ?? "";

                    return (
                      <TableCell key={`${table.title}-${rowIndex}-${column}-${cell}`}>
                        {renderCell(column, cell, table.actionMenuItems)}
                      </TableCell>
                    );
                  })}
                </TableRow>
                {hiddenColumnIndexes.length ? (
                  <TableRow className="bg-background/20">
                    <TableCell colSpan={orderedVisibleColumnIndexes.length}>
                      <details className="group rounded-xl border border-border/60 bg-background/35 px-3 py-2">
                        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition hover:text-foreground [&::-webkit-details-marker]:hidden">
                          Row details
                        </summary>
                        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                          {hiddenColumnIndexes.map((cellIndex) => {
                            const column = table.columns[cellIndex] ?? "";
                            const cell = row[cellIndex] ?? "";

                            return (
                              <div
                                className="rounded-lg border border-border/60 bg-card/40 p-3"
                                key={`${table.title}-${rowIndex}-detail-${column}`}
                              >
                                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                  {column}
                                </p>
                                <div className="mt-1 text-foreground">
                                  {renderCell(column, cell, table.actionMenuItems)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            ))}
          </TableBody>
        </Table>
        <div className="grid gap-3 rounded-xl border border-dashed border-border/80 bg-background/35 p-4 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
          <div>Sorting surfaces are reserved in the column header pattern.</div>
          <div>Pagination controls can anchor beneath this table without shifting layout.</div>
          <div>Row actions remain placeholder-only until module workflows are implemented.</div>
          <div>Mobile fallback can collapse rows into stacked cards on narrow screens.</div>
        </div>
      </CardContent>
    </Card>
  );
}
