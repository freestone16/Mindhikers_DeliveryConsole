import type { Request, Response } from 'express';

export const getAssets = (_req: Request, res: Response) => {
    res.json({
        success: true,
        assets: [],
        message: 'Music assets endpoint is currently running in compatibility mode.',
    });
};
