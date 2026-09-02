import { Fragment } from "react";
import { PASSWORD_PLACEHOLDER } from "@/lib/instances";

/** Renders a URI, highlighting `${PASSWORD}` in the theme accent. */
export default function UriText({ value }: { value: string }) {
  const parts = value.split(PASSWORD_PLACEHOLDER);
  if (parts.length === 1) return <>{value}</>;

  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="text-accent">{PASSWORD_PLACEHOLDER}</span>
          )}
        </Fragment>
      ))}
    </>
  );
}
