import snapshotJson from "../../public/data/paper-portfolio.latest.json";
import { paperPortfolioSnapshotSchema, type PaperPortfolioSnapshot } from "./publicContract";

export const latestPaperPortfolioSnapshot: PaperPortfolioSnapshot =
  paperPortfolioSnapshotSchema.parse(snapshotJson);
