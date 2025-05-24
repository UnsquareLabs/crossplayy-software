const app = require('./backend/app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  
  const open = require('child_process').exec;
  open(`start http://localhost:${PORT}`); // For Windows
});
