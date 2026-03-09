"use client";

import { useEffect } from "react";
import { Layout } from "@/ui/Layout";
import { pluginRegistry } from "@/plugins/registry";
import { sketchPlugin } from "@/plugins/sketch";
import { extrudePlugin } from "@/plugins/extrude";
import { holePlugin } from "@/plugins/hole";
import { stlExportPlugin } from "@/plugins/stl-export";
import { stlImportPlugin } from "@/plugins/stl-import";

export default function Home() {
  useEffect(() => {
    // Register all plugins
    pluginRegistry.register(sketchPlugin);
    pluginRegistry.register(extrudePlugin);
    pluginRegistry.register(holePlugin);
    pluginRegistry.register(stlExportPlugin);
    pluginRegistry.register(stlImportPlugin);

    return () => {
      pluginRegistry.deactivateAll();
    };
  }, []);

  return <Layout />;
}
