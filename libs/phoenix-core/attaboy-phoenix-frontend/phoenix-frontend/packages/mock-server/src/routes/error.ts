import { Router } from 'express';
import Errors from '../controllers/errorsController';


export default () => {
    const api = Router();

    // GET /error/409
    api.get("/409", Errors.simulate409);

    return api;
};
