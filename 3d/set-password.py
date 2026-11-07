#!/usr/bin/env python3
"""Change the projectboki.com/3d password. Only 3d/d/key.json changes.
Usage: python3 3d/set-password.py --old 'CURRENT' --new 'NEW'   (run from the website repo root)"""
import argparse,base64,hashlib,json,os,secrets,sys
ap=argparse.ArgumentParser(); ap.add_argument("--old",required=True); ap.add_argument("--new",required=True)
a=ap.parse_args()
if len(a.new)<10: sys.exit("New password must be at least 10 characters.")
p=os.path.join(os.path.dirname(os.path.abspath(__file__)),"d","key.json"); k=json.load(open(p))
d=hashlib.pbkdf2_hmac("sha256",a.old.encode(),base64.b64decode(k["salt"]),k["iter"],64)
if hashlib.sha256(d[32:]).hexdigest()!=k["check"]: sys.exit("The current (--old) password is wrong. Nothing changed.")
master=bytes(x^y for x,y in zip(base64.b64decode(k["wrapped"]),d[:32]))
salt=secrets.token_bytes(16); n=hashlib.pbkdf2_hmac("sha256",a.new.encode(),salt,k["iter"],64)
k.update(salt=base64.b64encode(salt).decode(),wrapped=base64.b64encode(bytes(x^y for x,y in zip(master,n[:32]))).decode(),check=hashlib.sha256(n[32:]).hexdigest())
json.dump(k,open(p,"w")); print("Password changed. Commit and push 3d/d/key.json. Everyone needs the new password; saved logins stop working.")
