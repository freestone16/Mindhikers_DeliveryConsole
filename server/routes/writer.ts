import express from 'express';

const router = express.Router();

router.get('/', (_req, res) => {
    res.json({ module: 'writer', status: 'placeholder' });
});

export default router;
