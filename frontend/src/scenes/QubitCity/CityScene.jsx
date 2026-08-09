import CityBuildings from "./CityBuildings";
import NeonGrid from "./NeonGrid";
import Particles from "./Particles";
import QuantumCore from "./QuantumCore";
import Ambience from "./Ambience";
import BuilderRig from "./BuilderRig";
import GatePalette3D from "./GatePalette3D";
import HoloHistogram from "./HoloHistogram";
import Eigen from "./Eigen";
import FxPool from "./FxPool";
import MemoryWall from "./MemoryWall";
import Portal from "../../components/Portal";

// All city-era content. OdysseyWorld owns the Canvas/atmosphere around it.
export default function CityScene() {
  return (
    <>
      <CityBuildings />
      <NeonGrid />
      <Particles />
      <QuantumCore />
      <Ambience />
      <BuilderRig />
      <GatePalette3D />
      <HoloHistogram />
      <Eigen />
      <FxPool />
      <MemoryWall />
      <Portal to="wave" label="OCEAN OF WAVES" position={[-14, 2.2, -6]} ringColor="#ff2d95" />
      <Portal to="schrodinger" label="THE UNCERTAIN ROOM" position={[14, 2.2, -6]} ringColor="#7c3aed" />
    </>
  );
}
