import { Router, type IRouter } from "express";
import healthRouter from "./health";
import collectionRouter from "./collection";
import houseRulesRouter from "./houseRules";
import scryfallRouter from "./scryfall";
import decksRouter from "./decks";
import wishlistRouter from "./wishlist";
import priceRefreshRouter from "./priceRefresh";
import csvImportRouter from "./csvImport";
import settingsRouter from "./settings";
import feedbackRouter from "./feedback";

const router: IRouter = Router();

router.use(healthRouter);
router.use(collectionRouter);
router.use(houseRulesRouter);
router.use(scryfallRouter);
router.use(decksRouter);
router.use(wishlistRouter);
router.use(priceRefreshRouter);
router.use(csvImportRouter);
router.use(settingsRouter);
router.use(feedbackRouter);

export default router;
