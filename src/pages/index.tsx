import type { NextPage } from 'next';
import { Hero } from '../components/hero/Hero';
import { FloatingButtonStrip } from '../components/nav/FloatingButtonStrip';
import { TransferTokenCard } from '../features/transfer/TransferTokenCard';

const Home: NextPage = () => {
  return (
    <div className="flex flex-col items-center space-y-1 pt-2">
      <Hero />
      <div className="relative mt-2 w-full max-w-100 sm:max-w-[31rem]">
        <TransferTokenCard />
        <FloatingButtonStrip />
      </div>
    </div>
  );
};

export default Home;
