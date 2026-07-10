-- Débit conditionnel et atomique du solde : élimine la course entre le
-- SELECT balance / vérification "solde suffisant" et le débit qui suivait
-- dans app/api/user/bets/route.ts (deux requêtes concurrentes pouvaient
-- toutes les deux lire le même solde avant qu'aucune n'écrive, et donc
-- placer plusieurs paris pour un solde qui n'aurait dû en couvrir qu'un).
-- `WHERE balance >= amount` dans le même UPDATE garantit qu'une seule
-- requête concurrente peut réussir si le solde ne couvre qu'une mise ;
-- les autres reçoivent NULL (aucune ligne mise à jour) et ne débitent rien.
CREATE OR REPLACE FUNCTION public.decrement_balance_if_sufficient(user_uuid UUID, amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_balance NUMERIC;
BEGIN
  UPDATE public.users
  SET balance = balance - amount, updated_at = now()
  WHERE id = user_uuid AND balance >= amount
  RETURNING balance INTO new_balance;
  RETURN new_balance; -- NULL si le solde était insuffisant (aucune ligne mise à jour)
END;
$$;
