function testApi() {
  fetch('/api/test')
    .then(res => res.json())
    .then(data => {
      document.getElementById('result').innerText = data.message;
    })
    .catch(err => {
      document.getElementById('result').innerText = 'Error calling backend.';
      console.error(err);
    });
}
