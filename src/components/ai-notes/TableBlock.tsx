import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableBlock as TableBlockType } from "@/types/ai-notes";

interface TableBlockProps {
  headers: TableBlockType['headers'];
  rows: TableBlockType['rows'];
}

export default function TableBlock({ headers, rows }: TableBlockProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {headers.map((header, index) => (
              <TableHead key={index} className="font-semibold text-foreground border-border">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex} className={rowIndex % 2 === 0 ? "bg-surface" : "bg-muted/20"}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex} className="border-border text-foreground">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}