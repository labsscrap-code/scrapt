'use strict';
const form=document.getElementById('login'),status=document.getElementById('status');
form.addEventListener('submit',async event=>{
  event.preventDefault();
  const button=form.querySelector('button');button.disabled=true;
  status.textContent='Signing in…';
  try {
    await ScraptClient.login(form.elements.name.value,form.elements.password.value);
    location.assign('/terminal');
  } catch(error) {
    status.textContent=error.kind==='rate_limited'?`Too many attempts. Retry in ${error.retryAfter} seconds.`:
      error.kind==='https_required'?'Verified HTTPS is required.':
      error.kind==='invalid_login'?'Username or password not accepted.':'Access unavailable. Contact the pilot operator.';
  } finally {form.elements.password.value='';button.disabled=false;}
});
