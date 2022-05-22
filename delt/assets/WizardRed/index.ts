import WizardD from "./Down.png";
import WizardR from "./Right1.png";
import WizardRAlt from "./Right2.png";
import WizardL from "./Left1.png";
import WizardLAlt from "./Left2.png";
import WizardRa from "./FireRight.png";
import WizardLa from "./FireLeft.png";
import Projectile from "./Projectile.png";
import WizardDead1 from "./Death1.png";
import WizardDead2 from "./Death2.png";
import WizardDead3 from "./Death3.png";
import WizardDead4 from "./Death4.png";
import WizardUp from "./Up.png";
import { ITextureList } from "../../entities/wizard";

const WizardMap: ITextureList = {
    "Down": WizardD,
    "Right": WizardR,
    "RightAlt": WizardRAlt,
    "Left": WizardL,
    "LeftAlt": WizardLAlt,
    "RightAttack": WizardRa,
    "LeftAttack": WizardLa,
    "Projectile": Projectile,
    "Dead1": WizardDead1,
    "Dead2": WizardDead2,
    "Dead3": WizardDead3,
    "Dead4": WizardDead4,
    "Up": WizardUp
}

export default WizardMap;