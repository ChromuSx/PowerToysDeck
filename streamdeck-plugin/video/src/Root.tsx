import React from "react";
import { Composition, Still } from "remotion";
import {
  GalleryHero,
  GalleryPropertyInspector,
  GallerySync,
  InspectorQuickAccess,
  InspectorRun,
  InspectorKeyboard,
  PowerToyboxPromo,
  PowerToyboxThumbnail,
} from "./PowerToyboxPromo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PowerToyboxPromo"
        component={PowerToyboxPromo}
        durationInFrames={2100}
        fps={60}
        width={1920}
        height={1080}
      />
      <Still
        id="PowerToyboxThumbnail"
        component={PowerToyboxThumbnail}
        width={1920}
        height={960}
      />
      <Still
        id="PowerToyboxHero"
        component={GalleryHero}
        width={1920}
        height={960}
      />
      <Still
        id="PowerToyboxPropertyInspector"
        component={GalleryPropertyInspector}
        width={1920}
        height={960}
      />
      <Still
        id="PowerToyboxSync"
        component={GallerySync}
        width={1920}
        height={960}
      />
      <Still
        id="PowerToyboxInspectorQuickAccess"
        component={InspectorQuickAccess}
        width={960}
        height={1440}
      />
      <Still
        id="PowerToyboxInspectorRun"
        component={InspectorRun}
        width={960}
        height={1440}
      />
      <Still
        id="PowerToyboxInspectorKeyboard"
        component={InspectorKeyboard}
        width={960}
        height={1440}
      />
    </>
  );
};

