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
    <table className={`min-w-full divide-y divide-white/10 text-left text-sm ${className}`.trim()}>
      {children}
    </table>
  );
}

export function TableHead({ children, className = "" }: TableSectionProps) {
  return <thead className={`bg-white/[0.045] backdrop-blur ${className}`.trim()}>{children}</thead>;
}

export function TableBody({ children, className = "" }: TableSectionProps) {
  return <tbody className={`divide-y divide-white/8 bg-transparent ${className}`.trim()}>{children}</tbody>;
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
      className={`px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white/42 ${className}`.trim()}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: TableCellProps) {
  return <td className={`px-4 py-3 text-slate-300 ${className}`.trim()}>{children}</td>;
}

