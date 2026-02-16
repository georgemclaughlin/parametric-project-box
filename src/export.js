import { stlSerializer } from "https://esm.sh/@jscad/io@2.4.12";

const { serialize } = stlSerializer;

export function exportStl(filename, geom) {
  const data = serialize({ binary: true }, geom);
  const blob = new Blob(data, { type: "model/stl" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 500);
}
