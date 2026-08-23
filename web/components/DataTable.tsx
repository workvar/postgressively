import { EmptyState } from "./ui/Panel";
import { Table, TableWrap, Td, Th, Tr, mono } from "./ui/Table";
import { cell } from "@/lib/format";

type Props = {
  columns: string[];
  rows: unknown[][];
};

export default function DataTable({ columns, rows }: Props) {
  if (columns.length === 0) {
    return (
      <TableWrap>
        <EmptyState>No columns returned.</EmptyState>
      </TableWrap>
    );
  }

  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            {columns.map((c) => (
              <Th key={c}>{c}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <Tr key={i}>
              {row.map((v, j) => {
                const isNull = v === null || v === undefined;
                return (
                  <Td
                    key={j}
                    className={`max-w-xs truncate ${mono} ${isNull ? "italic text-fg-subtle" : "text-fg"}`}
                  >
                    {cell(v)}
                  </Td>
                );
              })}
            </Tr>
          ))}
        </tbody>
      </Table>
      {rows.length === 0 && <EmptyState>No rows.</EmptyState>}
    </TableWrap>
  );
}
