useEffect(() => {
    if (response?.type === "success") {
      const accessToken = response.authentication?.accessToken;
  
      if (!accessToken) return;
  
      handleSignup(accessToken);
    }
  }, [response]);
  
  async function handleSignup(token: string) {
    try {
      const res = await fetch("http://YOUR_BACKEND_IP:8000/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
  
      if (!res.ok) {
        throw new Error("Signup failed");
      }
  
      // backend accepted user
      router.replace("/home");
    } catch (err) {
      console.error(err);
    }
  }
  