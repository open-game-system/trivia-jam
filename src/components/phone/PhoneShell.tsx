import type { ReactNode } from "react";

/** A printed page for phones and iPads: paper, ink, grain. */
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
  <div className={`phone-shell riso ${fill ? "phone-fill" : ""} ${className}`}>
    {children}
  </div>
);
