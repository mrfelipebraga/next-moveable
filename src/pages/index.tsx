import React from "react";
import { SelectoArea } from "../components/SelectoArea";

export default function Home() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <SelectoArea />;
}
