-- Query for Google CLoud Instance
set search_path=threemsc;
select * from users;

--Query to view all user's page access history

select username, page_path, ip_address, accessed_at, user_agent 
from page_access_history pah, users u
where pah.user_id = u.id
order by accessed_at desc
;

