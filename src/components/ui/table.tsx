import * as React from "react";

type TableProps = {
  children: React.ReactNode;
  className?: string;
};

type TableSectionProps = {
  children: React.ReactNode;
  className?: string;
};

type TableCellProps = {
  children: React.ReactNode;
  className?: string;
};

type TableRowProps = React.HTMLAttributes<HTMLTableRowElement> & {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLTableRowElement>;
};

export function Table({ children, className = "" }: TableProps) {
  return (
    <table className={`min-w-full divide-y divide-slate-200/80 text-left text-sm ${className}`.trim()}>
      {children}
    </table>
  );
}

export function TableHead({ children, className = "" }: TableSectionProps) {
  return <thead className={`bg-slate-50/80 backdrop-blur ${className}`.trim()}>{children}</thead>;
}

export function TableBody({ children, className = "" }: TableSectionProps) {
  return <tbody className={`divide-y divide-slate-100 bg-white/95 ${className}`.trim()}>{children}</tbody>;
}

export function TableRow({ children, className = "", ...rest }: TableRowProps) {
  return (
    <tr className={`transition-colors ${className}`.trim()} {...rest}>
      {children}
    </tr>
  );
}

export function Th({ children, className = "" }: TableCellProps) {
  return (
    <th
      className={`px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 ${className}`.trim()}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: TableCellProps) {
  return <td className={`px-4 py-3 text-slate-700 ${className}`.trim()}>{children}</td>;
}

