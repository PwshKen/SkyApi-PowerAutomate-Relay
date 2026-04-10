power automate flow:

1. we've received a user_id
2. does this match to exactly 1 BEM user?
    - if yes, continue
    - if no, throw error and stop
3. get the user's host_id.
    - is it a valid P#?
    - if below 20,000, continue
    - if above 5,000,000, does it match user_id?
4. update the host_id if needed
5. report success or failure