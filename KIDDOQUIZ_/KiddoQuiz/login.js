fetch('http://localhost:3000/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
      email: userEmail,
      password: userPassword
  })
})
.then(response => response.json())
.then(data => {
  if (data.token) {
      localStorage.setItem('token', data.token); // ✅ Store token in localStorage
      console.log('Token stored:', data.token);
  } else {
      console.log('Login failed:', data.message);
  }
})
.catch(error => console.error('Error:', error));
