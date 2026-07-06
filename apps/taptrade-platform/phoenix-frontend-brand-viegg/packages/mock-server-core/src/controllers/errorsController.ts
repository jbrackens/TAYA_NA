
export default {
  async simulate409(req: any, res: any) {
    res.status(409).json({
      error: new Error('Conflict error'),
      message: 'Conflict error message',
      params: { 
        entityName: "MyEntity",
      }
    })
  },
};
