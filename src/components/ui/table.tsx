import * as React from "react";

type TableProps = {
  children: React.ReactNode;
  className?: string;
};

type TableContainerProps = {
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  header?: React.ReactNode;
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
    <table className={`min-w-full divide-y divide-slate-200 text-left text-sm ${className}`.trim()}>
      {children}
    </table>
  );
}

export function TableContainer({ children, className = "", footer, header }: TableContainerProps) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`.trim()}>
      {header ? <div className="border-b border-slate-200 px-4 py-3">{header}</div> : null}
      <div className="overflow-x-auto">{children}</div>
      {footer ? <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">{footer}</div> : null}
    </div>
  );
}

export function TableHead({ children, className = "" }: TableSectionProps) {
  return <thead className={`bg-slate-50 ${className}`.trim()}>{children}</thead>;
}

export function TableBody({ children, className = "" }: TableSectionProps) {
  return <tbody className={`divide-y divide-slate-100 bg-white ${className}`.trim()}>{children}</tbody>;
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
      className={`px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 ${className}`.trim()}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: TableCellProps) {
  return <td className={`px-4 py-3 text-slate-700 ${className}`.trim()}>{children}</td>;
}
