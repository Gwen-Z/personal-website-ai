export default function handler(req, res) {
  res.status(200).json({ 
    success: true,
    status: 'OK', 
    timestamp: new Date().toISOString(),
    ai_service: true
  });
}
