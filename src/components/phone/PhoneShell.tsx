import type { ReactNode } from "react";

/** A page for phones and iPads: the aurora backdrop, Inter, glass on top. */
export const PhoneShell = ({
  children,
  fill = false,
  className = "",
}: {
  children: ReactNode;
  /** Lock to the visible height (answering screens never scroll). */
  fill?: boolean;
  className?: string;
}) => (
  <div className={`phone-shell aurora ${fill ? "phone-fill" : ""} ${className}`}>
    {children}
  </div>
);
