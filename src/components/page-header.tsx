import type { ReactNode } from "react";

/**
 * Editorial page title in the Recurra style: large tight headline with an optional
 * highlighted word carrying a round icon chip, a short description, and actions on the right.
 */
export function PageHeader({
  title,
  highlight,
  icon,
  description,
  actions,
}: {
  title: ReactNode;
  highlight?: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-3xl">
        <h1 className="font-heading text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl lg:text-[2.6rem]">
          {title}
          {highlight && (
            <>
              {" "}
              <span className="inline-flex items-center gap-2 align-middle">
                {icon && <span className="inline-flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground sm:size-10 [&_svg]:size-4">{icon}</span>}
                {highlight}
              </span>
            </>
          )}
        </h1>
        {description && <p className="mt-2 text-sm text-muted-foreground sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
