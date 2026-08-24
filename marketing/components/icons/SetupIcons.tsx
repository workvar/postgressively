import type { IconType } from "react-icons";
import { FaWindows } from "react-icons/fa6";
import {
  SiApple,
  SiDocker,
  SiLinux,
  SiPm2,
  SiRaspberrypi,
} from "react-icons/si";
import { TbServerCog } from "react-icons/tb";
import type { SetupMethod, SetupOS } from "@/lib/setup-guides";

export const OS_META: Record<
  SetupOS,
  { label: string; Icon: IconType; color: string }
> = {
  windows: { label: "Windows", Icon: FaWindows, color: "#0078D4" },
  macos: { label: "macOS", Icon: SiApple, color: "currentColor" },
  linux: { label: "Linux", Icon: SiLinux, color: "#FCC624" },
  rpi: { label: "Raspberry Pi OS", Icon: SiRaspberrypi, color: "#C51A4A" },
};

export const METHOD_META: Record<
  SetupMethod,
  { label: string; hint: string; Icon: IconType; color: string }
> = {
  docker: {
    label: "Docker Compose",
    hint: "Full stack in containers",
    Icon: SiDocker,
    color: "#2496ED",
  },
  pm2: {
    label: "PM2 bundle",
    hint: "Pre-built binaries",
    Icon: SiPm2,
    color: "#2C0370",
  },
  systemd: {
    label: "Systemd",
    hint: "Native Linux services",
    Icon: TbServerCog,
    color: "#E95420",
  },
};
